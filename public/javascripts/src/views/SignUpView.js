var SignUpView = Backbone.View.extend({
	signUpTemplate: require('../../../../views/signUp.handlebars'),
	events: {
		'submit #signUpForm': 'handleSubmit'
	},
	render: function () {
		let signUpRendered = this.signUpTemplate();
		this.$el.html(signUpRendered);
	},
	handleSubmit: function (e) {
		e.preventDefault();
		var userPostData = $(e.currentTarget).serializeArray();
		userPostData[2] = {
			name: 'username',
			value: this.$('#signUpEmail').val()
		};
		$.ajax('/api/users', {
			method: 'post',
			data: userPostData
		}).done((response) => {
			this.trigger('signedUp', response);
			this.trigger('signedIn', response);
		}).fail((response) => {
			if (response.responseText.toLowerCase().indexOf('already exists') !== -1) {
				this.trigger('emailTaken');
			} else {
				this.trigger('signUpFailed', response);
			}
		});
	}
});

export default SignUpView;