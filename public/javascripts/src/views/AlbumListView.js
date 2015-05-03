import SignUpView from './SignUpView';

var AlbumListView = Backbone.View.extend({
	albumsTemplate: require('../../../../views/albums.handlebars'),
	className: 'album-list-view',
	events: {
		'submit #signUpForm': 'handleSubmit'
	},
	initialize: function () {
		this.listenTo(this.collection.albums, 'sync', this.render);
		this.listenTo(this.collection.albums, 'sync', this.updateEmptyState);
	},
	delegateEvents: function () {
		return Backbone.View.prototype.delegateEvents.apply(this, arguments);
	},
	render: function () {
		let albumsRendered = this.albumsTemplate({
			albums : this.collection.albums.viewModel()
		});
		this.$el.html(albumsRendered);
		return this;
	},
	updateEmptyState: function () {
		if (!this.collection.albums || !this.collection.albums.length) {
			this.$('.album-list').addClass('empty');
		} else {
			this.$('.album-list').removeClass('empty');
		}
	},
	handleSubmit: function (e) {
		e.preventDefault();
		var userPostData = $(e.currentTarget).serializeArray();
		userPostData[2] = {
			name: 'username',
			value: this.$('#signInEmail').val()
		};
		$.ajax('/api/users', {
			method: 'post',
			data: userPostData
		}).done(function(response) {
			Backbone.history.navigate('/a', { trigger : true });
		}).fail(function(response) {
			console.log('Failed to sign up user.');
		});
	}
});

export default AlbumListView;